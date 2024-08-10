interface StackProps {
    sceneWidth: number;
    sceneHeight: number;
    direction: number;//1-top,2-right,3-bottom,4-left,0-center
    isPop?: boolean;
}
const StackAnimation = ({ sceneWidth, sceneHeight, direction, isPop }: StackProps) => {

    const play = () => {


    }
    // tl.play();
    return { play }
}
export default StackAnimation